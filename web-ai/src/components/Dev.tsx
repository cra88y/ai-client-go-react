
import { useEffect, useContext } from 'preact/hooks';
import { FunctionComponent } from 'preact';
import { useCookies } from 'react-cookie';
import { UserContext } from '../userContext';
import { ChangeEvent } from 'preact/compat';

export const Dev: FunctionComponent = () => {
  const { apiKey, setApiKey } = useContext(UserContext);
  const [cookies, setCookie] = useCookies(['apiKey']);

  const onApiKeyChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target instanceof HTMLInputElement) setApiKey(e.target.value);
  };

  useEffect(() => {
    if (cookies.apiKey) {
      setApiKey(cookies.apiKey);
    }
  }, [cookies.apiKey, setApiKey]);

  useEffect(() => {
    setCookie('apiKey', apiKey, { path: '/' });
  }, [apiKey, setCookie]);

  return (
    <div>
      <span>
        API_KEY: <input onChange={onApiKeyChange} value={apiKey} type="text" />
      </span>
    </div>
  );
};