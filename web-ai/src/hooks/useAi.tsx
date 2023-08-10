
import { useContext } from 'preact/hooks';
import axios from 'axios';
import { UserContext } from '../userContext';

export interface AiOptions {
  specifyPrompt: boolean;
  generateSearchTerm: boolean;
  search: boolean;
  searchResultsCount: number;
  processSearchResults: boolean;
  maxResponseTokens: number;
}

export function useAi() {
  const { apiKey, threads, currThread, setThreads } = useContext(UserContext);

  const aiQuery = async (options: AiOptions) => {
    try {
      const response = await axios.post(
        'http://127.0.0.1:3000/ai',
        {
          apiKey,
          messages: threads[currThread],
          layerOptions: options,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = response.data;
      const message = data.choices[0].message;

      setThreads({
        ...threads,
        [currThread]: [
          ...(threads[currThread] || []),
          { Role: message.role, Content: message.content },
        ],
      });
    } catch (err) {
      console.log(err);
    }
  };

  return {
    aiQuery,
  };
}