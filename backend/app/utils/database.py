"""
Database utility functions and query optimizations.

This module provides common database operations and query optimization utilities.
"""

from typing import Any, Dict, List, Optional, Tuple, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func
from sqlalchemy.orm import selectinload, joinedload
from app.core.logging import get_logger
from app.utils.performance import measure_time, QueryOptimizer

logger = get_logger("database")


class DatabaseUtils:
    """Utility class for common database operations."""
    
    @staticmethod
    async def execute_paginated_query(
        db: AsyncSession,
        query: str,
        params: Dict[str, Any],
        page: int = 1,
        per_page: int = 20,
        max_per_page: int = 100
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Execute a paginated query with count.
        
        Returns:
            Tuple of (results, total_count)
        """
        # Validate pagination parameters
        page = max(1, page)
        per_page = min(max_per_page, max(1, per_page))
        offset = (page - 1) * per_page
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM ({query}) as count_subquery"
        with measure_time(f"Count query: {query[:50]}..."):
            count_result = await db.execute(text(count_query), params)
            total_count = count_result.scalar() or 0
        
        # Get paginated results
        paginated_query = f"{query} LIMIT :limit OFFSET :offset"
        paginated_params = {**params, "limit": per_page, "offset": offset}
        
        with measure_time(f"Paginated query: {query[:50]}..."):
            result = await db.execute(text(paginated_query), paginated_params)
            rows = result.mappings().all()
        
        return [dict(row) for row in rows], total_count
    
    @staticmethod
    async def batch_insert(
        db: AsyncSession,
        table_name: str,
        records: List[Dict[str, Any]],
        batch_size: int = 1000,
        on_conflict: str = "DO NOTHING"
    ) -> int:
        """
        Insert records in batches for better performance.
        
        Returns:
            Number of records processed
        """
        if not records:
            return 0
        
        total_processed = 0
        optimal_batch_size = QueryOptimizer.batch_size_for_count(len(records), batch_size)
        
        for i in range(0, len(records), optimal_batch_size):
            batch = records[i:i + optimal_batch_size]
            
            # Build column names and placeholders
            columns = list(batch[0].keys())
            column_names = ", ".join(columns)
            placeholders = ", ".join([f":{col}" for col in columns])
            
            query = f"""
                INSERT INTO {table_name} ({column_names})
                VALUES ({placeholders})
                ON CONFLICT {on_conflict}
            """
            
            with measure_time(f"Batch insert {len(batch)} records into {table_name}"):
                for record in batch:
                    await db.execute(text(query), record)
                
                total_processed += len(batch)
        
        await db.commit()
        logger.info(f"Batch inserted {total_processed} records into {table_name}")
        return total_processed
    
    @staticmethod
    async def bulk_update(
        db: AsyncSession,
        table_name: str,
        updates: List[Dict[str, Any]],
        id_column: str = "id",
        batch_size: int = 500
    ) -> int:
        """
        Update records in batches using CASE statements.
        
        Returns:
            Number of records updated
        """
        if not updates:
            return 0
        
        total_updated = 0
        optimal_batch_size = QueryOptimizer.batch_size_for_count(len(updates), batch_size)
        
        for i in range(0, len(updates), optimal_batch_size):
            batch = updates[i:i + optimal_batch_size]
            
            # Get all columns to update (excluding id)
            update_columns = set()
            for record in batch:
                update_columns.update(record.keys())
            update_columns.discard(id_column)
            
            if not update_columns:
                continue
            
            # Build CASE statements for each column
            case_statements = []
            for col in update_columns:
                cases = []
                for record in batch:
                    if col in record:
                        cases.append(f"WHEN {id_column} = :{id_column}_{record[id_column]} THEN :{col}_{record[id_column]}")
                
                if cases:
                    case_statements.append(f"{col} = CASE {' '.join(cases)} ELSE {col} END")
            
            if not case_statements:
                continue
            
            # Build parameter dictionary
            params = {}
            for record in batch:
                params[f"{id_column}_{record[id_column]}"] = record[id_column]
                for col in update_columns:
                    if col in record:
                        params[f"{col}_{record[id_column]}"] = record[col]
            
            # Execute update
            ids = [str(record[id_column]) for record in batch]
            query = f"""
                UPDATE {table_name}
                SET {', '.join(case_statements)}
                WHERE {id_column} IN ({','.join([f':{id_column}_{id_val}' for id_val in ids])})
            """
            
            with measure_time(f"Bulk update {len(batch)} records in {table_name}"):
                result = await db.execute(text(query), params)
                total_updated += result.rowcount or 0
        
        await db.commit()
        logger.info(f"Bulk updated {total_updated} records in {table_name}")
        return total_updated
    
    @staticmethod
    async def optimize_query_with_indexes(
        db: AsyncSession,
        table_name: str,
        columns: List[str]
    ) -> None:
        """
        Create indexes for commonly queried columns.
        """
        for column in columns:
            index_name = f"idx_{table_name}_{column}"
            query = f"""
                CREATE INDEX IF NOT EXISTS {index_name}
                ON {table_name} ({column})
            """
            
            try:
                with measure_time(f"Creating index {index_name}"):
                    await db.execute(text(query))
                    await db.commit()
                logger.info(f"Created index {index_name}")
            except Exception as e:
                logger.warning(f"Failed to create index {index_name}: {e}")
                await db.rollback()


class QueryBuilder:
    """Helper class for building dynamic SQL queries."""
    
    def __init__(self, base_query: str):
        self.base_query = base_query
        self.conditions: List[str] = []
        self.params: Dict[str, Any] = {}
        self.order_by: List[str] = []
    
    def add_condition(self, condition: str, **params) -> 'QueryBuilder':
        """Add a WHERE condition with parameters."""
        self.conditions.append(condition)
        self.params.update(params)
        return self
    
    def add_optional_condition(self, condition: str, value: Any, param_name: str) -> 'QueryBuilder':
        """Add condition only if value is not None/empty."""
        if value is not None and value != "":
            self.conditions.append(condition)
            self.params[param_name] = value
        return self
    
    def add_in_condition(self, column: str, values: List[Any], param_prefix: str) -> 'QueryBuilder':
        """Add IN condition with list of values."""
        if values:
            placeholders = []
            for i, value in enumerate(values):
                param_name = f"{param_prefix}_{i}"
                placeholders.append(f":{param_name}")
                self.params[param_name] = value
            
            self.conditions.append(f"{column} IN ({','.join(placeholders)})")
        return self
    
    def add_date_range(self, column: str, start_date: Any = None, end_date: Any = None) -> 'QueryBuilder':
        """Add date range conditions."""
        if start_date:
            self.add_condition(f"{column} >= :start_date", start_date=start_date)
        if end_date:
            self.add_condition(f"{column} <= :end_date", end_date=end_date)
        return self
    
    def add_order_by(self, column: str, direction: str = "ASC") -> 'QueryBuilder':
        """Add ORDER BY clause."""
        self.order_by.append(f"{column} {direction.upper()}")
        return self
    
    def build(self) -> Tuple[str, Dict[str, Any]]:
        """Build the final query and parameters."""
        query = self.base_query
        
        if self.conditions:
            query += " WHERE " + " AND ".join(self.conditions)
        
        if self.order_by:
            query += " ORDER BY " + ", ".join(self.order_by)
        
        return query, self.params
