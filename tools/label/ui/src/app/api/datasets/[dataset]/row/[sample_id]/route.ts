import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { NextResponse } from 'next/server';
import { enrichSample } from '@/lib/benchmarkEnricher';

const DATASETS_DIR = path.join(process.cwd(), '..', 'datasets');
const LABELS_DIR = path.join(process.cwd(), '..', 'labels');

export async function GET(
  request: Request,
  { params }: { params: Promise<{ dataset: string; sample_id: string }> }
) {
  const resolvedParams = await params;
  const { dataset, sample_id } = resolvedParams;
  
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

    let labelObj: any = null;
    if (fs.existsSync(labelsPath)) {
      const labelText = fs.readFileSync(labelsPath, 'utf-8');
      for (const line of labelText.split('\n')) {
        if (!line.trim()) continue;
        try {
          const l = JSON.parse(line);
          if (String(l.sample_id) === String(sample_id)) {
            labelObj = l;
            break;
          }
        } catch (e) {}
      }
    }

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      if (!line.trim()) continue;
      
      const match = line.match(/"sample_id"\s*:\s*(?:"([^"]+)"|(\d+))/);
      const sid = match ? (match[1] || match[2]) : null;
      if (sid && String(sid) === String(sample_id)) {
        try {
          let row = JSON.parse(line);
          if (labelObj) {
            if (labelObj.llm_assigned) row.llm_assigned = labelObj.llm_assigned;
            if (labelObj.deterministic_labels) row.deterministic_labels = labelObj.deterministic_labels;
          }
          row = enrichSample(dataset, sample_id, row);
          return NextResponse.json(row);
        } catch(e) {}
      }
    }

    // If not found in file directly but label exists, enrich from labelObj
    if (labelObj) {
      const row = enrichSample(dataset, sample_id, labelObj);
      return NextResponse.json(row);
    }

    return new NextResponse('Sample not found', { status: 404 });
  } catch (error) {
    console.error(`Failed to read sample ${sample_id} from ${dataset}:`, error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
