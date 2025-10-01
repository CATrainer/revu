'use client';

import { useState } from 'react';
import { Download, FileText, File, Copy, CheckCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ExportDialogProps {
  sessionId: string;
  sessionTitle: string;
  messages: Message[];
  trigger?: React.ReactNode;
}

type ExportFormat = 'markdown' | 'pdf' | 'text';

export function ExportDialog({
  sessionId,
  sessionTitle,
  messages,
  trigger,
}: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [includeTimestamps, setIncludeTimestamps] = useState(false);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateMarkdown = () => {
    let content = '';
    
    if (includeMetadata) {
      content += `# ${sessionTitle}\n\n`;
      content += `**Exported:** ${new Date().toLocaleString()}\n`;
      content += `**Messages:** ${messages.length}\n\n`;
      content += `---\n\n`;
    }

    messages.forEach((message, index) => {
      const role = message.role === 'user' ? '👤 You' : '🤖 AI';
      const timestamp = includeTimestamps 
        ? ` _(${message.timestamp.toLocaleString()})_` 
        : '';
      
      content += `### ${role}${timestamp}\n\n`;
      content += `${message.content}\n\n`;
      
      if (index < messages.length - 1) {
        content += `---\n\n`;
      }
    });

    return content;
  };

  const generatePlainText = () => {
    let content = '';
    
    if (includeMetadata) {
      content += `${sessionTitle}\n`;
      content += `${'='.repeat(sessionTitle.length)}\n\n`;
      content += `Exported: ${new Date().toLocaleString()}\n`;
      content += `Messages: ${messages.length}\n\n`;
    }

    messages.forEach((message, index) => {
      const role = message.role === 'user' ? 'YOU' : 'AI';
      const timestamp = includeTimestamps 
        ? ` (${message.timestamp.toLocaleString()})` 
        : '';
      
      content += `${role}${timestamp}:\n`;
      content += `${message.content}\n\n`;
      
      if (index < messages.length - 1) {
        content += `${'-'.repeat(50)}\n\n`;
      }
    });

    return content;
  };

  const handleCopyToClipboard = async () => {
    const content = format === 'text' ? generatePlainText() : generateMarkdown();
    
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = async () => {
    setExporting(true);

    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'markdown') {
        content = generateMarkdown();
        filename = `${sessionTitle.replace(/[^a-z0-9]/gi, '-')}.md`;
        mimeType = 'text/markdown';
      } else if (format === 'text') {
        content = generatePlainText();
        filename = `${sessionTitle.replace(/[^a-z0-9]/gi, '-')}.txt`;
        mimeType = 'text/plain';
      } else {
        // PDF export - would need backend support
        // For now, fall back to markdown
        alert('PDF export coming soon! Using Markdown for now.');
        content = generateMarkdown();
        filename = `${sessionTitle.replace(/[^a-z0-9]/gi, '-')}.md`;
        mimeType = 'text/markdown';
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Close dialog after short delay
      setTimeout(() => {
        setOpen(false);
      }, 500);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Conversation</DialogTitle>
          <DialogDescription>
            Download this conversation in your preferred format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Export Format</Label>
            <RadioGroup value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
              <div className="flex items-center space-x-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                <RadioGroupItem value="markdown" id="format-markdown" />
                <Label htmlFor="format-markdown" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Markdown</div>
                      <div className="text-xs text-slate-500">Formatted text with syntax highlighting</div>
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                <RadioGroupItem value="text" id="format-text" />
                <Label htmlFor="format-text" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Plain Text</div>
                      <div className="text-xs text-slate-500">Simple text file</div>
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer opacity-50">
                <RadioGroupItem value="pdf" id="format-pdf" disabled />
                <Label htmlFor="format-pdf" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <div>
                      <div className="font-medium">PDF</div>
                      <div className="text-xs text-slate-500">Coming soon</div>
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Options */}
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Label>Export Options</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="timestamps"
                checked={includeTimestamps}
                onCheckedChange={(checked) => setIncludeTimestamps(checked as boolean)}
              />
              <Label htmlFor="timestamps" className="text-sm font-normal cursor-pointer">
                Include timestamps
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="metadata"
                checked={includeMetadata}
                onCheckedChange={(checked) => setIncludeMetadata(checked as boolean)}
              />
              <Label htmlFor="metadata" className="text-sm font-normal cursor-pointer">
                Include metadata (title, date, message count)
              </Label>
            </div>
          </div>

          {/* Preview Info */}
          <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
            <strong>{messages.length}</strong> messages will be exported
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleCopyToClipboard}
            disabled={exporting}
            className="w-full sm:w-auto"
          >
            {copied ? (
              <>
                <CheckCheck className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy to Clipboard
              </>
            )}
          </Button>
          <Button
            onClick={handleDownload}
            disabled={exporting}
            className="w-full sm:w-auto"
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download File
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
