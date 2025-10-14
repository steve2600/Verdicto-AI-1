  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!scrollAreaRef.current) return;

    const viewport = scrollAreaRef.current.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
    if (!viewport) return;

    // Ensure smooth touch scrolling on iOS
    try {
      (viewport.style as any).webkitOverflowScrolling = "touch";
    } catch {
      // no-op
    }

    // Simple, reliable scroll to bottom
    const scrollToBottom = () => {
      viewport.scrollTop = viewport.scrollHeight;
    };

    // Use setTimeout to ensure DOM has updated
    setTimeout(scrollToBottom, 100);
  }, [messages, isLoading]);