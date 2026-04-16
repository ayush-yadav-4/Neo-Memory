import React, { useState } from 'react';
import { ChatInterface } from '@/components/chat/ChatInterface';

export default function TalkWithFile() {
  const [conversationId, setConversationId] = useState<string | null>(null);

  return (
    <div className="h-screen">
      <ChatInterface
        externalConversationId={conversationId}
        onConversationChange={setConversationId}
        showFileUpload={true}
      />
    </div>
  );
}

