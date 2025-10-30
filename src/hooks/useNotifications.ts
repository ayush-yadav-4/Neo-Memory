import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useNotifications = () => {
  const { toast } = useToast();

  const playNotificationSound = useCallback(() => {
    try {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  }, []);

  const notifyMCPConnection = useCallback((clientName: string) => {
    playNotificationSound();
    toast({
      title: '🤖 MCP Connected',
      description: `${clientName} has connected to the Memory API server`,
      duration: 5000,
    });
  }, [toast, playNotificationSound]);

  const notifyMemoryAdded = useCallback((memoryContent: string) => {
    playNotificationSound();
    toast({
      title: '💾 Memory Added',
      description: `New memory stored: "${memoryContent.substring(0, 50)}${memoryContent.length > 50 ? '...' : ''}"`,
      duration: 4000,
    });
  }, [toast, playNotificationSound]);

  const notifyMemoryDeleted = useCallback(() => {
    playNotificationSound();
    toast({
      title: '🗑️ Memory Deleted',
      description: 'Memory has been successfully removed',
      duration: 3000,
    });
  }, [toast, playNotificationSound]);

  const notifyApiKeyGenerated = useCallback((keyName: string) => {
    playNotificationSound();
    toast({
      title: '🔑 API Key Generated',
      description: `New API key "${keyName}" has been created`,
      duration: 4000,
    });
  }, [toast, playNotificationSound]);

  return {
    notifyMCPConnection,
    notifyMemoryAdded,
    notifyMemoryDeleted,
    notifyApiKeyGenerated,
    playNotificationSound,
  };
};
