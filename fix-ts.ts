import fs from 'fs';

const files = [
  'src/pages/admin/AdminApiKeys.tsx',
  'src/pages/admin/AdminMedia.tsx',
  'src/pages/admin/AdminProfile.tsx',
  'src/pages/admin/AdminTestimonials.tsx',
  'src/pages/admin/AdminWebhooks.tsx',
  'src/pages/public/Contact.tsx'
];

files.forEach(f => {
  const path = `./${f}`;
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    if (!content.includes("import React") && content.includes("React.")) {
      content = "import React from 'react';\n" + content;
      fs.writeFileSync(path, content, 'utf8');
      console.log('Fixed', path);
    }
  }
});
