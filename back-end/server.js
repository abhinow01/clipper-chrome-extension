// 📁 electron-app/server.js
const express = require('express');
const ytdl = require('@distube/ytdl-core');
const { spawn } = require('child_process');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(cors());

// Serve clips folder statically
const clipsDir = path.join(__dirname, 'clips');
app.use('/clips', express.static(clipsDir));

const port = process.env.PORT || 4567;
// Ensure clips directory exists
if (!fs.existsSync(clipsDir)) {
  fs.mkdirSync(clipsDir);
}
app.get('/ping', (req, res) => {
  res.send('pong');
});

app.post('/clip', async (req, res) => {
  const { url, startTime, endTime } = req.body;

  if (!url || startTime == null || endTime == null) {
    return res.status(400).json({ error: 'Missing URL, startTime, or endTime' });
  }

  console.log(`⏱️ Clipping from ${startTime}s to ${endTime}s of: ${url}`);

  const toSeconds = (timeStr) => {
    const parts = timeStr.split(':').map(Number).reverse();
    return parts.reduce((acc, val, i) => acc + val * Math.pow(60, i), 0);
  };

  const startSeconds = toSeconds(startTime);
  const endSeconds = toSeconds(endTime);
  const duration = endSeconds - startSeconds;

  if (isNaN(startSeconds) || isNaN(endSeconds)) {
    return res.status(400).json({ error: 'Invalid time format. Use mm:ss or hh:mm:ss.' });
  }

  if (duration <= 0 || duration > 600) {
    return res.status(400).json({ error: 'Invalid duration (must be >0 and ≤600s)' });
  }

  try {
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, {
      quality: 'highestvideo',
      filter: 'videoonly'
    });

    if (!format?.url) {
      return res.status(500).json({ error: 'Could not extract video stream' });
    }

    const timestamp = Date.now();
    const filename = `clip-${timestamp}.mp4`;
    const outputPath = path.join(clipsDir, filename);

    const ffmpeg = spawn('ffmpeg', [
      '-ss', `${startTime}`,
      '-i', format.url,
      '-t', `${duration}`,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-an',
      outputPath
    ]);

    ffmpeg.stderr.on('data', data => {
      console.log('FFmpeg:', data.toString());
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Clip saved: ${outputPath}`);
        const publicURL = `http://localhost:${port}/clips/${filename}`;
        res.json({
          success: true,
          file: filename,
          url: publicURL
        });
      } else {
        console.error(`FFmpeg failed with code ${code}`);
        res.status(500).json({ error: 'FFmpeg processing failed' });
      }
    });

  } catch (err) {
    console.error('Clip error:', err);
    res.status(500).json({ error: err.message || 'Failed to clip video' });
  }
});

app.listen(port, () => {
  console.log(`📡 Clipper server running at http://localhost:${port}`);
});
