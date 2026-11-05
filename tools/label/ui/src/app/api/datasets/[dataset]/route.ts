import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { Readable } from 'stream';
import { NextResponse } from 'next/server';
import { enrichSample } from '@/lib/benchmarkEnricher';

const DATASETS_DIR = path.join(process.cwd(), '..', 'datasets');
const LABELS_DIR = path.join(process.cwd(), '..', 'labels');

export async function GET(
  request: Request,
  { params }: { params: Promise<{ dataset: string }> }
) {
  const resolvedParams = await params;
  const dataset = resolvedParams.dataset;
  
  try {
    let filePath = path.join(DATASETS_DIR, `${dataset}.jsonl`);
    const labelsPath = path.join(LABELS_DIR, `${dataset}.jsonl`);

    if (!fs.existsSync(filePath)) {
      if (fs.existsSync(labelsPath)) {
        filePath = labelsPath;
      } else {
        return new NextResponse('Dataset not found', { status: 404 });
      }
    }

    const labelsMap = new Map();
    if (fs.existsSync(labelsPath)) {
      const labelText = fs.readFileSync(labelsPath, 'utf-8');
      labelText.split('\n').forEach(line => {
        if (!line.trim()) return;
        try {
          const l = JSON.parse(line);
          labelsMap.set(String(l.sample_id), l);
        } catch (e) {}
      });
    }

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    const allRows: any[] = [];

    for await (const line of rl) {
      if (!line.trim()) continue;
      let outputLine = line;
      
      // Strip out large base64 images to avoid browser memory spikes
      outputLine = outputLine.replace(/"image"\s*:\s*"data:[^"]+;base64,[^"]+"/g, '"image":"[IMAGE_STRIPPED]"');
      
      try {
        let obj = JSON.parse(outputLine);
        const labelObj = labelsMap.get(String(obj.sample_id));
        if (labelObj) {
          if (labelObj.llm_assigned) obj.llm_assigned = labelObj.llm_assigned;
          if (labelObj.deterministic_labels) obj.deterministic_labels = labelObj.deterministic_labels;
        }
        
        // Enrich sample with authentic prompt inputs and evaluation outcomes
        obj = enrichSample(dataset, obj.sample_id, obj);
        allRows.push(obj);
      } catch(e) {}
    }

    // Default sort by numeric sample_id ascending (0, 1, 2, 3...)
    allRows.sort((a, b) => {
      const numA = parseInt(String(a.sample_id), 10);
      const numB = parseInt(String(b.sample_id), 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return String(a.sample_id).localeCompare(String(b.sample_id));
    });

    const iterator = async function* () {
      for (const row of allRows) {
        yield JSON.stringify(row) + '\n';
      }
    };

    const stream = Readable.toWeb(Readable.from(iterator())) as ReadableStream;
    return new NextResponse(stream, { headers: { 'Content-Type': 'text/plain' } });
  } catch (error) {
    console.error(`Failed to read dataset ${dataset}:`, error);
    return new NextResponse('Failed to read dataset', { status: 500 });
  }
}
