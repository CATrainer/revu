"""Generate a bcrypt password hash for manual user creation."""

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Generate hash for the test password
password = "TestAgency123!"
hashed = pwd_context.hash(password)

print(f"Password: {password}")
print(f"Bcrypt Hash: {hashed}")
print()
print("Use this hash in your SQL INSERT statement:")
print(f"hashed_password = '{hashed}'")
