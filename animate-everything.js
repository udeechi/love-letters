const fs = require('fs');
let code = fs.readFileSync('src/app/chat/page.tsx', 'utf8');

// Global replacement of buttons
code = code.replace(/<button/g, '<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}');
code = code.replace(/<\/button>/g, '</motion.button>');

// 1. Header
code = code.replace(/<header className="/g, '<motion.header initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="');
code = code.replace(/<\/header>/g, '</motion.header>');

// 2. Main
code = code.replace(/<main className="/g, '<motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="');
code = code.replace(/<\/main>/g, '</motion.main>');

// 3. Footer
code = code.replace(/<footer className="/g, '<motion.footer initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="');
code = code.replace(/<\/footer>/g, '</motion.footer>');

// 4. Message Bubble Wrapper
const messageTarget = `                  <div key={msg.id} className={\`flex flex-col \${isMe ? "items-end" : "items-start"}\`}>`;
const messageReplacement = `                  <motion.div 
                    layout
                    key={msg.id} 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                    transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
                    className={\`flex flex-col \${isMe ? "items-end" : "items-start"}\`}
                  >`;
code = code.replace(messageTarget, messageReplacement);

// Fix the closing div for messages
// Since the message return is simple, we can replace the last </div> before );
const returnBlock = code.split('messages.map((msg) => {')[1];
if (returnBlock) {
   // This is tricky, let's target the exact closing tag for the message div.
   // Instead of regex, we can do it specifically:
   code = code.replace(/<\/div>\n              \);\n            }\)/g, '</motion.div>\n              );\n            })');
}

// 5. Wrap the top-level Auth Link
const authLinkTarget = `<Link \n          href="/" \n          className="absolute top-6 left-6`;
const authLinkReplacement = `<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} whileHover={{ scale: 1.05, x: -5 }} whileTap={{ scale: 0.95 }} className="absolute top-6 left-6 z-50">\n        <Link \n          href="/" \n          className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-full text-white/50 hover:text-white/90 hover:bg-white/[0.08] hover:border-white/20 transition-all backdrop-blur-md shadow-lg shadow-black/20"`;
// Wait, regex might fail with whitespace. Let's do it easier.
// I will just replace `<Link` in the auth view.
code = code.replace(
  /{[\s\S]*?\/\* Top Left Return Button \*\/[\s\S]*?<Link[\s\S]*?>[\s\S]*?<\/Link>/,
  (match) => {
    return match
      .replace('<Link', '<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} whileHover={{ scale: 1.05, x: -5 }} whileTap={{ scale: 0.95 }} className="absolute top-6 left-6 z-50">\n        <Link')
      .replace('className="absolute top-6 left-6 z-50', 'className="')
      .replace('</Link>', '</Link>\n        </motion.div>');
  }
);

// 6. Header logo link
code = code.replace(
  /<Link href="\/" className="text-\[#8a7a6a\] hover:text-\[#d4af37\] transition-colors">/,
  '<motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><Link href="/" className="text-[#8a7a6a] hover:text-[#d4af37] transition-colors">'
);
code = code.replace(
  /<\/polyline>\n            <\/svg>\n          <\/Link>/,
  '</polyline>\n            </svg>\n          </Link></motion.div>'
);


// 7. Inputs
// Add focus animations to auth inputs
code = code.replace(/<input\n                  type="text"\n                  value={username}/, 
'<motion.input whileFocus={{ scale: 1.02 }} type="text" value={username}');
code = code.replace(/<input\n                  type="password"\n                  value={password}/g, 
'<motion.input whileFocus={{ scale: 1.02 }} type="password" value={password}');

// Add to chat input
code = code.replace(/<input\n                type="text"\n                value={newMessage}/,
'<motion.input whileFocus={{ scale: 1.01, boxShadow: "0 0 0 2px rgba(212,175,55,0.3)" }} type="text" value={newMessage}');

// Convert those <motion.input to be self closing cleanly but we just replace the tag name
code = code.replace(/<motion\.input/g, '<motion.input');

// Fix closing tags for inputs if they aren't self closing? Inputs are self closing `/>` so we only replaced the start. 
// BUT we need to rename `<input` to `<motion.input` everywhere we added whileFocus.

// Actually, replacing `<input` with `<motion.input` is safer globally except for type="file" or type="range".
// Let's just use the exact strings above.

fs.writeFileSync('src/app/chat/page.tsx', code, 'utf8');
console.log('Replacements executed!');
