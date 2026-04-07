import HomeClient from "./home-client";

export default function Home() {
  return (
    <HomeClient
      serverHasApiKey={Boolean(process.env.ANTHROPIC_API_KEY?.trim())}
    />
  );
}
