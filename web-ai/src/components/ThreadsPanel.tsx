import {  useContext } from 'preact/hooks';
import {  FunctionComponent } from 'preact';
import { UserContext } from '../userContext';

export const ThreadsPanel: FunctionComponent = () => {
  const { threads } = useContext(UserContext);

  return (
    <div className="panel-container">
      <div className="panel-header">Threads</div>
      <a href="/">+ New Thread</a>
      {Object.keys(threads).map((threadKey) => {
        const thread = threads[Number(threadKey)];
        return (
          <div className="thread-title" key={threadKey}>
            <a href={`/threads/${threadKey}`}>{thread[0].Content.slice(0, 50)}</a>
          </div>
        );
      })}
    </div>
  );
};
