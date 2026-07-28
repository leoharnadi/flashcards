
interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  return (
    <div className={`toast ${message ? 'on' : ''}`} id="toast">
      {message}
    </div>
  );
};
