import fs from 'fs'
import https from 'https'

const dot = `
digraph ERD {
  node [shape=record, fontname="Arial", style="filled", fillcolor="white", color="black"];
  edge [fontname="Arial", color="black"];
  rankdir=LR;
  bgcolor="white";

  users [label="{users | + student_id (PK)\\l+ full_name\\l+ email\\l+ role\\l+ avatar_url\\l+ created_at\\l}"];
  products [label="{products | + product_id (PK)\\l+ seller_id (FK)\\l+ title\\l+ description\\l+ price\\l+ category\\l+ image_url\\l+ status\\l+ created_at\\l}"];
  orders [label="{orders | + order_id (PK)\\l+ product_id (FK)\\l+ buyer_id (FK)\\l+ rider_id (FK)\\l+ needs_delivery\\l+ delivery_location\\l+ delivery_image_url\\l+ status\\l+ created_at\\l}"];
  messages [label="{messages | + id (PK)\\l+ sender_id (FK)\\l+ receiver_id (FK)\\l+ product_id (FK)\\l+ content\\l+ is_read\\l+ created_at\\l}"];
  refunds [label="{refunds | + id (PK)\\l+ order_id (FK)\\l+ reason\\l+ evidence_url\\l+ status\\l+ created_at\\l}"];
  reports [label="{product_reports | + id (PK)\\l+ product_id (FK)\\l+ reporter_id (FK)\\l+ issue_type\\l+ description\\l+ admin_notes\\l+ status\\l+ created_at\\l}"];

  users -> products [label="lists"];
  users -> orders [label="places/delivers"];
  users -> messages [label="sends"];
  users -> reports [label="reports"];
  
  products -> orders [label="in"];
  products -> reports [label="has"];
  products -> messages [label="about"];
  
  orders -> refunds [label="has"];
}
`;

const url = 'https://quickchart.io/graphviz?format=png&width=1200&height=800&graph=' + encodeURIComponent(dot);

https.get(url, (res) => {
  const path1 = 'd:\\\\โครงงานรักมือสองเว็บ\\\\database_schema.png';
  const path2 = 'C:\\\\Users\\\\acer\\\\.gemini\\\\antigravity\\\\brain\\\\5065dc84-ea95-46f5-a52b-5d0525758e26\\\\database_schema.png';
  
  const file1 = fs.createWriteStream(path1);
  const file2 = fs.createWriteStream(path2);
  
  res.pipe(file1);
  res.pipe(file2);
  
  file1.on('finish', () => {
    file1.close();
    console.log('Saved to ' + path1);
  });
  file2.on('finish', () => {
    file2.close();
    console.log('Saved to ' + path2);
  });
}).on('error', (err) => {
  console.error('Error: ', err.message);
});
