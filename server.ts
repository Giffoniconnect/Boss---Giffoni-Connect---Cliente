import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const app = express();
const port = process.env.PORT || 3000;

// Need to handle both ESM and CJS contexts
const getDirname = () => {
  try {
    return dirname(fileURLToPath(import.meta.url));
  } catch {
    return __dirname;
  }
};

const distPath = join(getDirname(), '../dist');

app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
