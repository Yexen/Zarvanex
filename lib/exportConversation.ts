import type { Conversation } from '@/types';

export function exportToMarkdown(conversation: Conversation): string {
  let markdown = `# ${conversation.title}\n\n`;
  markdown += `**Created:** ${new Date(conversation.createdAt).toLocaleString()}\n`;
  markdown += `**Model:** ${conversation.modelId}\n\n`;
  markdown += '---\n\n';

  conversation.messages.forEach((msg) => {
    const role = msg.role === 'user' ? '**You**' : '**Assistant**';
    const time = new Date(msg.timestamp).toLocaleTimeString();
    markdown += `### ${role} (${time})\n\n`;
    markdown += `${msg.content}\n\n`;

    if (msg.images && msg.images.length > 0) {
      markdown += `_[${msg.images.length} image(s) attached]_\n\n`;
    }
  });

  return markdown;
}

export function exportToJSON(conversation: Conversation): string {
  return JSON.stringify(conversation, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportConversation(conversation: Conversation, format: 'markdown' | 'json') {
  const timestamp = new Date().toISOString().split('T')[0];
  const safeTitle = conversation.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

  if (format === 'markdown') {
    const content = exportToMarkdown(conversation);
    downloadFile(content, `${safeTitle}_${timestamp}.md`, 'text/markdown');
  } else {
    const content = exportToJSON(conversation);
    downloadFile(content, `${safeTitle}_${timestamp}.json`, 'application/json');
  }
}
