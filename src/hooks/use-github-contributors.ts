import { useState, useEffect } from 'react';

export interface Contributor {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

export function useGitHubContributors(repoOwner: string, repoName: string) {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContributors = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `https://api.github.com/repos/${repoOwner}/${repoName}/contributors`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch contributors: ${response.statusText}`);
        }
        
        const data = await response.json();
        setContributors(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setContributors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchContributors();
  }, [repoOwner, repoName]);

  return { contributors, loading, error };
}
