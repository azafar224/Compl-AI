import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

export async function GET() {
  try {
    const csvPath = path.join(process.cwd(), '..', 'taxonomy.csv');
    
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({ error: `Could not find CSV at ${csvPath}` }, { status: 500 });
    }
    
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    
    const records: any[] = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });

    const taxonomyData: Record<string, any> = {};
    const primaryLabels: string[] = [];
    const secondaryLabels: string[] = [];
    const tags: string[] = [];

    for (const record of records) {
      const id: string = record.label_id || '';
      if (!id) continue;

      if (id.startsWith('modality:') || id.startsWith('agent:')) {
        tags.push(id);
      } else {
        const parts = id.split(':');
        if (parts.length === 1) {
          primaryLabels.push(id);
        } else if (parts.length === 2) {
          secondaryLabels.push(id);
        }
      }
      
      taxonomyData[id] = {
        name: record.label_name || id,
        description: record.description || ''
      };
    }

    return NextResponse.json({
      primary_labels: primaryLabels,
      secondary_labels: secondaryLabels,
      tags,
      details: taxonomyData
    });
  } catch (error) {
    console.error('Failed to parse taxonomy CSV:', error);
    return NextResponse.json({ error: 'Failed to parse taxonomy' }, { status: 500 });
  }
}
