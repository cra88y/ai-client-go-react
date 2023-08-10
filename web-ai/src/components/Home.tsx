import { useContext, useEffect} from 'preact/hooks';
import { UserContext } from '../userContext';
import { Thread } from './Thread';
import { QueryBox } from './QueryBox';
import { FunctionComponent } from 'preact';

interface HomeProps {
  id: number;
}

export const Home: FunctionComponent<HomeProps> = ({ id }) => {
  const { setCurrThread, currThread, threads } = useContext(UserContext);

  useEffect(() => {
    setCurrThread(id);
  }, [id]);

  return (
    <div className="chat-container">
      <Thread messages={threads[currThread]} />
      <QueryBox />
    </div>
  );
};
