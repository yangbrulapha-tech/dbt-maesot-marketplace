const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else {
      if (dirFile.endsWith('.jsx')) {
        filelist.push(dirFile);
      }
    }
  });
  return filelist;
};

const files = walkSync('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  // Fix missed texts
  content = content.replace(/\btext-slate-600\b(?!.*dark:text-)/g, 'text-slate-600 dark:text-slate-300');
  content = content.replace(/\btext-slate-400\b(?!.*dark:text-)/g, 'text-slate-400 dark:text-slate-300');
  content = content.replace(/\btext-slate-500\b(?!.*dark:text-)/g, 'text-slate-500 dark:text-slate-300');
  
  // Also boost the brightness of existing dark texts from previous script
  content = content.replace(/dark:text-slate-400/g, 'dark:text-slate-300');
  
  // Add dark variants to missed backgrounds
  content = content.replace(/\bbg-slate-100\b(?!.*dark:bg-)/g, 'bg-slate-100 dark:bg-slate-800');
  content = content.replace(/\bbg-slate-200\b(?!.*dark:bg-)/g, 'bg-slate-200 dark:bg-slate-700');
  content = content.replace(/\bhover:bg-slate-100\b(?!.*dark:hover:bg-)/g, 'hover:bg-slate-100 dark:hover:bg-slate-800');
  content = content.replace(/\bhover:bg-slate-200\b(?!.*dark:hover:bg-)/g, 'hover:bg-slate-200 dark:hover:bg-slate-700');
  content = content.replace(/\bbg-primary-50\b(?!.*dark:bg-)/g, 'bg-primary-50 dark:bg-primary-900/20');
  
  // Fix double dark variants that might have occurred
  content = content.replace(/dark:text-slate-300 dark:text-slate-300/g, 'dark:text-slate-300');
  content = content.replace(/dark:bg-slate-800 dark:bg-slate-800/g, 'dark:bg-slate-800');
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
});
