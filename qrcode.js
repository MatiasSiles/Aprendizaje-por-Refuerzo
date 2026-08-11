(() => {
  const QR_CONTAINER_ID = 'qr-code';
  const QR_HELP_ID = 'qr-help';
  const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);

  function createFallback(url) {
    const container = document.getElementById(QR_CONTAINER_ID);
    const help = document.getElementById(QR_HELP_ID);
    if (!container) return;

    container.innerHTML = '';
    const fallback = document.createElement('div');
    fallback.className = 'qr-fallback';
    fallback.style.cssText = [
      'width: 180px',
      'padding: 12px',
      'border-radius: 12px',
      'border: 1px solid #7c9eff',
      'background: #0f1427',
      'color: #f6f7fb',
      'font-size: 12px',
      'line-height: 1.4',
      'text-align: center',
      'box-sizing: border-box',
    ].join(';');
    fallback.innerHTML = `<strong>QR listo</strong><br>${url}`;
    container.appendChild(fallback);

    if (help) {
      help.textContent = 'Escaneá este código para abrir el juego desde tu celular.';
    }
  }

  function renderQr(url) {
    const container = document.getElementById(QR_CONTAINER_ID);
    if (!container) return;

    const help = document.getElementById(QR_HELP_ID);
    if (help) {
      help.textContent = `Escaneá este código para abrir el juego desde tu celular: ${url}`;
    }

    if (window.QRCode) {
      container.innerHTML = '';
      container.style.background = '#ffffff';
      container.style.padding = '16px';
      container.style.display = 'inline-block';
      container.style.boxSizing = 'content-box';
      new window.QRCode(container, {
        text: url,
        width: 240,
        height: 240,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: window.QRCode.CorrectLevel.H,
      });
      return;
    }

    const existingScript = document.querySelector('script[src*="qrcode.min.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => renderQr(url), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    script.async = true;
    script.onload = () => {
      if (window.QRCode) {
        renderQr(url);
      } else {
        createFallback(url);
      }
    };
    script.onerror = () => createFallback(url);
    document.head.appendChild(script);
  }

  async function resolveReachableUrl() {
    const currentUrl = new URL(window.location.href);
    if (!LOOPBACK_HOSTS.has(currentUrl.hostname)) {
      return currentUrl.toString();
    }

    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdp = pc.localDescription?.sdp || '';
      const ips = [...sdp.matchAll(/candidate:(?:\S+)\s+(?:\S+)\s+(?:\S+)\s+(?:\S+)\s+(\d{1,3}(?:\.\d{1,3}){3})\s+/g)]
        .map((match) => match[1])
        .filter((ip) => !ip.startsWith('127.') && !ip.startsWith('169.254.') && ip !== '0.0.0.0');

      pc.close();

      if (ips.length) {
        const ip = ips[0];
        currentUrl.hostname = ip;
        return currentUrl.toString();
      }
    } catch (error) {
      console.warn('No se pudo resolver una IP local para el QR:', error);
    }

    return currentUrl.toString();
  }

  async function init() {
    const url = window.location.href && window.location.href !== 'about:blank'
      ? await resolveReachableUrl()
      : 'https://matiassiles.github.io/Aprendizaje-por-Refuerzo/';
    renderQr(url);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
