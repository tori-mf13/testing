import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const shortcuts: Record<string, string> = {
  'd': '/dashboard',
  's': '/saas',
  'i': '/identity',
  'a': '/assets',
  'e': '/security',
  'n': '/network',
  't': '/tickets',
  'w': '/workflows',
  'r': '/reports',
};

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Only trigger with Alt key, ignore when typing in inputs
      if (!e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const path = shortcuts[e.key.toLowerCase()];
      if (path) {
        e.preventDefault();
        navigate(path);
      }

      // Alt+K for AI chat
      if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('toggle-ai-chat'));
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
}
