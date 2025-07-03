// OneSignal Push Notifications
window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(async function(OneSignal) {
  await OneSignal.init({
    appId: "fe22a797-a48d-4d38-83a1-0c4d34e88a38",
    autoResubscribe: true,
    notifyButton: { enable: false } // We are using a custom button/logic
  });
});

// Service Worker Registration & Online Check
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js') // Ensure path is correct from root
    .then(registration => {
      console.log('Service Worker registered with scope:', registration.scope);
    })
    .catch(error => {
      console.error('Service Worker registration failed:', error);
    });
}

window.addEventListener('load', () => {
  if (!navigator.onLine) {
    alert('Estás desconectado. Algunas funciones pueden no estar disponibles.');
  }
  // Initialize AOS after page load and other initializations
  // AOS.init() is called in the original HTML body onload, so we'll replicate that.
  // However, it's better to call it here once the main JS logic is set up.
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 1000,
      once: true
    });
  } else {
    console.warn('AOS library not found. Animations might not work.');
  }
});

// Initialize AOS (This was originally in body onload)
// AOS.init call is moved to window.addEventListener('load', ...) to ensure AOS is defined.

// Create floating particles
function createParticles() {
  const particlesContainer = document.getElementById('particles');
  if (!particlesContainer) {
    console.warn('Particle container #particles not found.');
    return;
  }
  const particleCount = 50;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 6 + 's';
    particle.style.animationDuration = (Math.random() * 3 + 3) + 's'; // Corrected: Added '+'
    particlesContainer.appendChild(particle);
  }
}

// Audio player functionality
const radio = document.getElementById('radio');
const playBtn = document.getElementById('playBtn');
const volumeSlider = document.getElementById('volumeSlider');
const visualizer = document.getElementById('visualizer');
const statusText = document.getElementById('status-text');

let isPlaying = false;
let isLoading = false;

if (radio && playBtn && volumeSlider && visualizer && statusText) {
  // Set initial volume
  radio.volume = volumeSlider.value;
  playBtn.setAttribute('aria-label', 'Reproducir');
  playBtn.setAttribute('aria-pressed', 'false');
  updateVolumeSliderGUI();

  // Play/Pause functionality
  playBtn.addEventListener('click', togglePlay);

  function togglePlay() {
    if (isLoading) return;

    if (isPlaying) {
      radio.pause();
      playBtn.innerHTML = '▶️'; // Play icon
      playBtn.setAttribute('aria-label', 'Reproducir');
      playBtn.setAttribute('aria-pressed', 'false');
      isPlaying = false;
      statusText.textContent = '🎶 LEX RADIO - Pausado';
      stopVisualizer();
    } else {
      isLoading = true;
      playBtn.innerHTML = '⏳'; // Loading icon
      playBtn.setAttribute('aria-label', 'Cargando');
      // aria-pressed remains as it was, or could be removed if loading is a distinct state
      statusText.textContent = '🔄 Conectando...';

      radio.load(); // Ensure stream is loaded if it was preloaded=none
      radio.play().then(() => {
        playBtn.innerHTML = '⏸️'; // Pause icon
        playBtn.setAttribute('aria-label', 'Pausar');
        playBtn.setAttribute('aria-pressed', 'true');
        isPlaying = true;
        isLoading = false;
        statusText.textContent = '🎶 EN VIVO - Tus Recuerdos En El Presente';
        startVisualizer();
      }).catch(error => {
        console.error('Error playing audio:', error);
        playBtn.innerHTML = '▶️'; // Play icon on error
        playBtn.setAttribute('aria-label', 'Reproducir');
        playBtn.setAttribute('aria-pressed', 'false');
        isLoading = false;
        statusText.textContent = '❌ Error de conexión';
        stopVisualizer();
      });
    }
  }

  // Volume control
  volumeSlider.addEventListener('input', () => {
    radio.volume = volumeSlider.value;
    updateVolumeSliderGUI();
  });

  function updateVolumeSliderGUI() {
    const percentage = (parseFloat(volumeSlider.value) * 100);
    volumeSlider.style.setProperty('--volume-percent', percentage + '%');
    volumeSlider.setAttribute('aria-valuetext', Math.round(percentage) + '%');
  }

  // Visualizer animation
  function startVisualizer() {
    if (!visualizer) return;
    const bars = visualizer.querySelectorAll('.bar');
    bars.forEach(bar => {
      bar.style.animationPlayState = 'running';
    });
  }

  function stopVisualizer() {
    if (!visualizer) return;
    const bars = visualizer.querySelectorAll('.bar');
    bars.forEach(bar => {
      bar.style.animationPlayState = 'paused';
      bar.style.height = '10px'; // Reset to initial height
    });
  }

  // Error handling for the audio element itself
  radio.addEventListener('error', (e) => {
    console.error('Radio stream error:', e);
    playBtn.innerHTML = '▶️';
    isPlaying = false;
    isLoading = false;
    statusText.textContent = '❌ Error de transmisión';
    stopVisualizer();
  });

} else {
  console.warn('One or more audio player elements not found. Player functionality disabled.');
}

// PWA Install functionality
let deferredPrompt;
const installButton = document.getElementById('installButton');

if (installButton) {
  // Check if PWA is already installed (simplified check)
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
    installButton.style.display = 'none';
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Update UI to notify the user they can add to home screen
    installButton.classList.add('show');
  });

  installButton.addEventListener('click', async () => {
    if (deferredPrompt) {
      // Show the prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      try {
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          console.log('User accepted the A2HS prompt');
          installButton.style.display = 'none'; // Hide button after install
        } else {
          console.log('User dismissed the A2HS prompt');
        }
      } catch (error) {
        console.error('Error with PWA installation prompt:', error);
      }
      // We've used the prompt, and can't use it again, discard it
      deferredPrompt = null;
    } else {
      // Fallback for browsers that don't support PWA installation via beforeinstallprompt
      // or when the app is already installed and button somehow visible
      // or if the prompt was already used.
      alert('Para instalar la aplicación, busca la opción "Agregar a pantalla de inicio" o "Instalar" en el menú de tu navegador.');
      // Alternative: Share API if available
      // if (navigator.share) {
      //   navigator.share({
      //     title: 'LEX Radio',
      //     text: 'Tus recuerdos en el presente',
      //     url: window.location.href
      //   }).catch(console.error);
      // } else {
      //   // Copy URL to clipboard as fallback
      //   navigator.clipboard.writeText(window.location.href).then(() => {
      //     alert('¡URL copiada! Puedes agregarla a tu pantalla de inicio desde el menú de tu navegador.');
      //   }).catch(err => {
      //     alert('No se pudo copiar la URL. Por favor, cópiala manualmente.');
      //   });
      // }
    }
  });

  window.addEventListener('appinstalled', () => {
    // Log install to analytics
    console.log('PWA was installed');
    installButton.style.display = 'none';
    deferredPrompt = null; // Clear the prompt as it's no longer needed
  });

} else {
  console.warn('Install button #installButton not found. PWA install prompt functionality disabled.');
}

// Initialize particles (call after DOM is ready)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createParticles);
} else {
  createParticles(); // DOMContentLoaded has already fired
}


// Smooth scrolling for navigation links
document.querySelectorAll('nav a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const targetId = this.getAttribute('href');
    try {
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start' // Changed from 'center' to 'start' for more typical scroll behavior
        });
      } else {
        console.warn(`Smooth scroll target "${targetId}" not found.`);
      }
    } catch (error) { // Catches invalid selectors
        console.error(`Invalid selector for smooth scroll: ${targetId}`, error);
    }
  });
});

// Final check for AOS initialization if it was missed by body.onload moving
// This ensures AOS initializes if the script is loaded defer and DOMContentLoaded fires before load.
if (typeof AOS !== 'undefined' && !document.body.classList.contains('aos-initialized')) {
    AOS.init({
        duration: 1000,
        once: true
    });
}
