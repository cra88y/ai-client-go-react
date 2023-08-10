
import { FunctionComponent } from 'preact';
import Markdown  from 'preact-markdown';
import { Message } from '../types/Message';

interface ThreadProps {
  messages: Message[];
}

export const Thread: FunctionComponent<ThreadProps> = ({ messages }) => {
  return (
    <div className="thread-messages">
      {messages &&
        messages.map((msg) => {
          const { Role, Content } = msg;
          return (
            <div className="thread-message-container">
              <div className="thread-message-author">{Role}</div>
              <div className="thread-message">
                <Markdown markdown={Content} />
              </div>
            </div>
          );
        })}
    </div>
  );
};