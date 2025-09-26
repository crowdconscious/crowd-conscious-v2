// Theme initialization script - runs before React hydration
(function() {
  // Get saved theme or default to light
  const savedTheme = localStorage.getItem('theme') || 'light';
  
  // Remove any existing theme classes
  document.documentElement.classList.remove('dark');
  document.documentElement.removeAttribute('data-theme');
  
  // Apply theme immediately
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.style.colorScheme = 'dark';
  } else if (savedTheme === 'light') {
    document.documentElement.style.colorScheme = 'light';
  } else if (savedTheme === 'system') {
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.style.colorScheme = 'light';
    }
  }
})();
