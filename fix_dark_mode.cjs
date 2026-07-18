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
  
  // Add dark variants to text colors
  content = content.replace(/\btext-navy-900\b(?!.*dark:text-white)/g, 'text-navy-900 dark:text-white');
  content = content.replace(/\btext-slate-900\b(?!.*dark:text-white)/g, 'text-slate-900 dark:text-white');
  content = content.replace(/\btext-slate-800\b(?!.*dark:text-slate-200)/g, 'text-slate-800 dark:text-slate-200');
  content = content.replace(/\btext-slate-700\b(?!.*dark:text-slate-300)/g, 'text-slate-700 dark:text-slate-300');
  content = content.replace(/\btext-slate-500\b(?!.*dark:text-slate-400)/g, 'text-slate-500 dark:text-slate-400');
  
  // Add dark variants to background colors
  content = content.replace(/\bbg-white\b(?!.*dark:bg-slate-)/g, 'bg-white dark:bg-slate-800');
  content = content.replace(/\bbg-slate-50\b(?!.*dark:bg-slate-)/g, 'bg-slate-50 dark:bg-slate-900/50');
  
  // Add dark variants to border colors
  content = content.replace(/\bborder-slate-200\b(?!.*dark:border-)/g, 'border-slate-200 dark:border-slate-700');
  content = content.replace(/\bdivide-slate-100\b(?!.*dark:divide-)/g, 'divide-slate-100 dark:divide-slate-800');
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
});
