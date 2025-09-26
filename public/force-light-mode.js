// Manual theme reset - call this in browser console if needed
function forceLightMode() {
  console.log('Forcing light mode...');
  
  // Clear localStorage
  localStorage.setItem('theme', 'light');
  
  // Remove all dark mode classes
  document.documentElement.classList.remove('dark');
  document.documentElement.removeAttribute('data-theme');
  
  // Force light mode CSS variables
  document.documentElement.style.colorScheme = 'light';
  document.documentElement.style.setProperty('--background', '#ffffff');
  document.documentElement.style.setProperty('--foreground', '#090909');
  document.documentElement.style.setProperty('--input-background', '#ffffff');
  document.documentElement.style.setProperty('--input-foreground', '#020101');
  document.documentElement.style.setProperty('--input-border', '#d1d5db');
  document.documentElement.style.setProperty('--muted', '#374151');
  document.documentElement.style.setProperty('--muted-foreground', '#1f2937');
  
  // Force reload the page
  window.location.reload();
}

// Auto-run if needed
if (localStorage.getItem('theme') !== 'light') {
  console.log('Auto-applying light mode...');
  forceLightMode();
}
