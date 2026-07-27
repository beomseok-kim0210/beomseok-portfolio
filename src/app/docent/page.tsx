import { redirect } from "next/navigation";

// 도슨트는 Playground로 통합됐다. 이미 배포·공유된 /docent 링크를 살리기 위해
// 삭제 대신 영구 리다이렉트한다.
export default function DocentPage() {
  redirect("/playground");
}
