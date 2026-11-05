import fs from 'fs/promises';
import { createReadStream, existsSync } from 'fs';
import path from 'path';
import readline from 'readline';
import { NextResponse } from 'next/server';

const DATASETS_DIR = path.join(process.cwd(), '..', 'datasets');
const LABELS_DIR = path.join(process.cwd(), '..', 'labels');

// Fast in-memory cache
let cachedDatasets: { id: string; count: number }[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 1000; // 60 seconds

export async function GET() {
  try {
    const now = Date.now();
    if (cachedDatasets && (now - cacheTimestamp < CACHE_TTL)) {
      return NextResponse.json({ datasets: cachedDatasets });
    }

    let sourceDir = DATASETS_DIR;
    let files: string[] = [];

    if (existsSync(DATASETS_DIR)) {
      files = (await fs.readdir(DATASETS_DIR)).filter(f => f.endsWith('.jsonl'));
    }

    // Fall back to labels directory if raw datasets haven't been regenerated yet
    if (files.length === 0 && existsSync(LABELS_DIR)) {
      sourceDir = LABELS_DIR;
      files = (await fs.readdir(LABELS_DIR)).filter(f => f.endsWith('.jsonl') && !f.endsWith('_patch.jsonl'));
    }

    const datasets: { id: string; count: number }[] = [];
    
    for (const file of files) {
      const filePath = path.join(sourceDir, file);
      
      let count = 0;
      const fileStream = createReadStream(filePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });
      
      for await (const line of rl) {
        if (line.trim().length > 0) count++;
      }
      
      datasets.push({
        id: file.replace('.jsonl', ''),
        count
      });
    }

    datasets.sort((a, b) => a.id.localeCompare(b.id));
    cachedDatasets = datasets;
    cacheTimestamp = now;
      
    return NextResponse.json({ datasets });
  } catch (error) {
    console.error('Failed to read datasets directory:', error);
    return NextResponse.json({ error: 'Failed to read datasets' }, { status: 500 });
  }
}
