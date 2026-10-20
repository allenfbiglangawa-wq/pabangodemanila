import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-luxe py-32 text-center">
      <p className="eyebrow">404</p>
      <h1 className="display mt-4 text-5xl">This page has drifted away</h1>
      <Link href="/" className="btn-primary mt-10">Return Home</Link>
    </div>
  );
}
