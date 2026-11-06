const { spawn } = require('child_process');
const https = require('https');

let currentDomain = null;
let pingInterval = null;

function pingTunnel(url) {
  if (!url) return;
  https.get(url, (res) => {
    // tunnel active
  }).on('error', () => {
    // ignore ping errors
  });
}

function startTunnel() {
  console.log('🚀 Đang khởi động đường truyền công khai (localhost.run)...');

  const ssh = spawn('ssh', [
    '-R', '80:localhost:3000',
    '-o', 'ServerAliveInterval=30',
    '-o', 'ServerAliveCountMax=3',
    '-o', 'StrictHostKeyChecking=no',
    'nokey@localhost.run'
  ]);

  ssh.stdout.on('data', (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/([a-zA-Z0-9-]+\.lhr\.life)/);
    if (match) {
      currentDomain = `https://${match[1]}`;
      console.log('\n======================================================');
      console.log(`🌐 ĐƯỜNG TRUYỀN LIVE HOẠT ĐỘNG: ${currentDomain}`);
      console.log(`👉 Quản trị & Chấm công: ${currentDomain}/admin.html`);
      console.log(`👉 Khách hàng: ${currentDomain}/`);
      console.log('======================================================\n');

      if (!pingInterval) {
        // Ping every 45s to prevent activity timeout
        pingInterval = setInterval(() => {
          if (currentDomain) {
            pingTunnel(currentDomain);
          }
        }, 45000);
      }
    }
  });

  ssh.stderr.on('data', (data) => {
    // keep quiet on pseudo-terminal notices
  });

  ssh.on('close', (code) => {
    console.log(`⚠️ Tunnel đã đóng (code ${code}). Tự động kết nối lại sau 5 giây...`);
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    currentDomain = null;
    setTimeout(startTunnel, 5000);
  });
}

startTunnel();

