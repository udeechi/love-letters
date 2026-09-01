import sys

def fix_ig_urls():
    with open("src/app/chat/page.tsx", "r", encoding="utf-8") as f:
        code = f.read()

    # 1. Update parseIgLinks
    old_parser = '''const parseIgLinks = (text: string) => {
  const igRegex = /(https?:\\/\\/(?:www\\.)?instagram\\.com\\/(?:p|reel)\\/[a-zA-Z0-9_-]+\\/?\\S*)/g;
  const links = [...text.matchAll(igRegex)].map(m => m[0]);
  const cleanText = text.replace(igRegex, '').trim();
  return { cleanText, links };
};'''
    
    new_parser = '''const parseIgLinks = (text: string) => {
  const igRegex = /https?:\\/\\/(?:www\\.)?instagram\\.com\\/(?:p|reel)\\/([a-zA-Z0-9_-]+)(?:\\S*)/g;
  const linkIds = [...text.matchAll(igRegex)].map(m => m[1]); // Extract JUST the ID
  const cleanText = text.replace(igRegex, '').trim();
  return { cleanText, linkIds };
};'''
    
    if old_parser in code:
        code = code.replace(old_parser, new_parser)
    else:
        print("Could not find parser")

    # 2. Update IgEmbed signature and iframe URL
    old_igembed_sig = 'const IgEmbed = ({ url, msgId, setActiveMessageId }: { url: string, msgId: string, setActiveMessageId: (id: string | null) => void }) => {'
    new_igembed_sig = 'const IgEmbed = ({ reelId, msgId, setActiveMessageId }: { reelId: string, msgId: string, setActiveMessageId: (id: string | null) => void }) => {'
    
    if old_igembed_sig in code:
        code = code.replace(old_igembed_sig, new_igembed_sig)
    
    # Remove the safeUrl line
    old_safeurl = "const safeUrl = url.endsWith('/') ? url : url + '/';"
    if old_safeurl in code:
        code = code.replace(old_safeurl, "")

    # Update the iframe src
    old_iframe = 'src={`${safeUrl}embed/?hidecaption=1&autoplay=1`}'
    new_iframe = 'src={`https://www.instagram.com/p/${reelId}/embed/?hidecaption=1`}'
    if old_iframe in code:
        code = code.replace(old_iframe, new_iframe)

    # 3. Update the render loop
    old_render_loop = '''                                {links.map((link, i) => (
                                  <IgEmbed key={i} url={link} msgId={msg.id} setActiveMessageId={setActiveMessageId} />
                                ))}'''
    new_render_loop = '''                                {linkIds.map((id, i) => (
                                  <IgEmbed key={i} reelId={id} msgId={msg.id} setActiveMessageId={setActiveMessageId} />
                                ))}'''
    
    # Wait, in the text render block, it used `const { cleanText, links } = parseIgLinks(msg.text);`
    old_destructure = 'const { cleanText, links } = parseIgLinks(msg.text);'
    new_destructure = 'const { cleanText, linkIds } = parseIgLinks(msg.text);'
    
    if old_destructure in code:
        code = code.replace(old_destructure, new_destructure)
    
    if old_render_loop in code:
        code = code.replace(old_render_loop, new_render_loop)

    with open("src/app/chat/page.tsx", "w", encoding="utf-8") as f:
        f.write(code)

    print("IG Links fixed!")

fix_ig_urls()
