import { FunctionComponent } from 'preact';
import { UserProvider } from './userContext';
import { AppContainer } from './components/AppContainer';
import './app.css'
export const App: FunctionComponent = () => {
  return (
    <div className="app-container">
      <UserProvider>
        <AppContainer />
      </UserProvider>
    </div>
  );
};
