import { Component } from 'react';
import Link from 'next/link';
import { NextPageContext } from 'next';
import Router from 'next/router'; // Import Router
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTv, faCheck, faTimes, faAngleLeft } from '@fortawesome/free-solid-svg-icons';
import { view } from 'react-easy-state';

import Frame from '../components/Admin/Frame'; // Assuming Frame.js is now Frame.tsx or .js is fine with allowJs
import { login, ILoginResponse } from '../helpers/auth'; // Assuming login helper is/will be typed
import { display } from '../stores'; // display store is now TypeScript

interface ILoginPageProps {
  displayId?: string;
  loggedIn?: boolean; // Assuming Frame might pass this, or it comes from a wrapper
  // Add other props if any, e.g., from Next.js Router or custom HOCs
}

interface ILoginPageState {
  username: string;
  password: string;
  alert: 'success' | 'error' | 'info' | null; // Expanded to include 'info' based on usage
}

class Login extends Component<ILoginPageProps, ILoginPageState> {
  constructor(props: ILoginPageProps) {
    super(props);

    this.state = {
      username: '',
      password: '',
      alert: null,
    };
  }

  static async getInitialProps(ctx: NextPageContext): Promise<ILoginPageProps> {
    const displayId = ctx.query && typeof ctx.query.display === 'string' ? ctx.query.display : undefined;
    // Potentially fetch loggedIn status here if needed for initial render
    return { displayId };
  }

  componentDidMount() {
    const { displayId } = this.props;
    if (displayId) {
      display.setId(displayId); // setId is async but not awaited here, which is fine if not critical path
    }
  }

  performLogin = async (): Promise<void> => {
    const { username, password } = this.state;
    const { displayId } = this.props;
    try {
      // Assuming login function is updated to return a more detailed response or throw on error
      const resp: ILoginResponse = await login({ username, password }, undefined, displayId);
      if (!resp.success) {
        // This case might be handled by login throwing an error directly
        this.setState({ alert: 'error' });
      } else {
        this.setState({ alert: 'success' });
        // Optional: redirect on success
        // Router.push(displayId ? `/display/${displayId}` : '/admin');
      }
    } catch (error) {
      this.setState({ alert: 'error' });
    }
  };

  usernameChangeHandler = (event: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({
      username: event.target.value,
    });
  };

  passwordChangeHandler = (event: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({
      password: event.target.value,
    });
  };

  handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    this.performLogin();
  };

  render() {
    const { loggedIn } = this.props; // loggedIn might come from a session or auth HOC
    const { username, password, alert } = this.state;
    return (
      <Frame loggedIn={loggedIn}>
        <h1>Login</h1>
        <div className='formContainer'>
          <div className='logo'>
            <div className='icon'>
              <FontAwesomeIcon icon={faTv} fixedWidth size='lg' color='#7bc043' />
            </div>
          </div>
          <form
            className='form'
            onSubmit={this.handleSubmit}
          >
            {alert && (
              <div className={`alert-${alert}`}>
                <FontAwesomeIcon
                  icon={alert === 'success' ? faCheck : faTimes}
                  fixedWidth
                  size='sm'
                  color='white'
                />
                <span className={'alert-text'}>
                  {alert === 'success'
                    ? 'Successfully logged in to your account.'
                    : alert === 'error' 
                    ? 'Username or password not recognized.'
                    : 'Use the username "demo" and password "demo"'} 
                </span>
              </div>
            )}
            {/* Default info message shown when no other alert */}
            {!alert && (
                 <div className={'alert-info'}>
                    <span className={'alert-text'}>
                    Use the username "demo" and password "demo"
                    </span>
                </div>
            )}
            <label htmlFor='username'>Username</label> {/* Changed for to htmlFor */}
            <input
              type='text'
              className='username'
              id='username'
              placeholder='Enter your username...'
              value={username}
              onChange={this.usernameChangeHandler}
            />
            <label htmlFor='password'>Password</label> {/* Changed for to htmlFor */}
            <input
              type='password'
              className='password'
              id='password'
              placeholder='Enter your password...'
              value={password}
              onChange={this.passwordChangeHandler}
            />
            <button type="submit">Log In.</button> {/* Added type="submit" */}
          </form>
          <Link href='/'>
            <span className='back'>
              <FontAwesomeIcon icon={faAngleLeft} fixedWidth /> Back to the home page
            </span>
          </Link>
        </div>
        <style jsx>
          {`
            h1 {
              font-family: 'Open Sans', sans-serif;
              font-size: 24px;
              color: #4f4f4f;
              margin: 0px;
            }
            .logo {
              display: flex;
              flex-direction: row;
              margin-top: 20px;
              margin-bottom: 20px;
              padding-right: 10px;
              padding-left: 10px;
              align-self: center;
            }
            .logo .icon {
              min-width: 3em;
              min-height: 3em;
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              transform: scale(2);
            }
            .form {
              background: white;
              border-radius: 8px;
              display: flex;
              flex-direction: column;
              padding: 24px;
              font-family: 'Open Sans', sans-serif;
            }
            .formContainer {
              max-width: 640px;
              margin: auto;
              display: flex;
              flex-direction: column;
            }
            .form input[type='text'],
            .form input[type='password'] {
              outline: none;
              background: #ededed;
              border-radius: 8px;
              font-family: 'Open Sans', sans-serif;
              font-weight: 400;
              font-size: 16px;
              color: #928f8f;
              border: none;
              padding: 8px;
              height: 32px;
              min-width: 256px;
              vertical-align: middle;
              -webkit-appearance: none;
              margin-bottom: 16px;
            }
            .form button {
              outline: none;
              background: #7bc043;
              border-radius: 8px;
              font-family: 'Open Sans', sans-serif;
              font-weight: 600;
              font-size: 18px;
              color: #ffffff;
              text-align: center;
              border: none;
              padding: 4px;
              height: 48px;
              vertical-align: middle;
              padding-left: 16px;
              padding-right: 16px;
              -webkit-appearance: none;
            }
            .form label {
              padding-bottom: 16px;
            }
            .back {
              display: inline-block;
              margin: 16px;
              font-family: 'Open Sans', sans-serif;
              color: #6f6e6e;
              font-size: 14px; /* Corrected: was 14 */
              cursor: pointer;
            }
            .alert-error {
              background: #e74c3c;
              border-radius: 6px;
              margin-bottom: 16px;
              padding: 16px;
            }
            .alert-info {
              background: #3ca9e7;
              border-radius: 6px;
              margin-bottom: 16px;
              padding: 16px;
            }
            .alert-success {
              background: #7bc043;
              border-radius: 6px;
              margin-bottom: 16px;
              padding: 16px;
            }
            .alert-text {
              color: white;
              margin-left: 8px;
            }
          `}
        </style>
      </Frame>
    );
  }
}

export default view(Login);
