// Emergency theme reset script
console.log('🚨 EMERGENCY THEME RESET ACTIVATED');

// Clear all theme-related localStorage
localStorage.removeItem('theme');
localStorage.removeItem('user-theme');
localStorage.removeItem('color-scheme');

// Force set light theme
localStorage.setItem('theme', 'light');

// Remove all dark classes
document.documentElement.classList.remove('dark');
document.documentElement.removeAttribute('data-theme');

// Force light mode styles
document.documentElement.style.colorScheme = 'light';
document.documentElement.style.background = '#ffffff';
document.documentElement.style.color = '#090909';

// Force body styles
document.body.style.background = '#ffffff';
document.body.style.color = '#090909';

// Add light mode class if needed
document.documentElement.classList.add('light');

console.log('✅ Theme reset complete - should be in light mode');
console.log('Current classes:', document.documentElement.className);
console.log('Current color scheme:', document.documentElement.style.colorScheme);

// Force reload to ensure changes take effect
setTimeout(() => {
  window.location.reload();
}, 500);
