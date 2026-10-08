import { NextResponse } from "next/server";
import { mkdir,writeFile } from "node:fs/promises";
import path from "node:path";
export async function POST(request:Request){
  if(process.env.NODE_ENV!=="development")return new NextResponse(null,{status:404});
  if(request.headers.get("origin")!==new URL(request.url).origin)return new NextResponse(null,{status:403});
  const body=await request.json();
  if(!/^(baseline|A|B|C|D)-(hero|core|split|text|response)$/.test(body.name)||typeof body.png!=="string"||!body.png.startsWith("data:image/png;base64,")||body.png.length>30000000)return new NextResponse(null,{status:400});
  const dir=path.join(process.cwd(),"docs/design-references/immersive-portfolio/armi-production-audit");await mkdir(dir,{recursive:true});
  await writeFile(path.join(dir,`${body.name}.png`),Buffer.from(body.png.split(",")[1],"base64"));
  await writeFile(path.join(dir,`${body.name}.json`),JSON.stringify({stats:body.stats,metrics:body.metrics},null,2));
  return NextResponse.json({saved:body.name});
}
