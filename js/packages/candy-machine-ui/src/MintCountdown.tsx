import Countdown from 'react-countdown';

interface MintCountdownProps {
  date: Date | undefined;
  status?: string;
  onComplete?: () => void;
}

interface MintCountdownRender {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  completed: boolean;
}

export const MintCountdown: React.FC<MintCountdownProps> = ({
  date,
  status,
  onComplete,
}) => {
  const renderCountdown = ({
    days,
    hours,
    minutes,
    seconds,
    completed,
  }: MintCountdownRender) => {
    hours += days * 24;
    if (completed) {
      return status ? (
        <span className="coinfra-countdown-done">{status}</span>
      ) : null;
    } else {
      return (
        <div className="coinfra-countdown-root">
          <div>
            <span className="coinfra-countdown-item">
              {hours < 10 ? `0${hours}` : hours}
            </span>
            <span>hrs</span>
          </div>
          <div>
            <span className="coinfra-countdown-item">
              {minutes < 10 ? `0${minutes}` : minutes}
            </span>
            <span>mins</span>
          </div>
          <div>
            <span className="coinfra-countdown-item">
              {seconds < 10 ? `0${seconds}` : seconds}
            </span>
            <span>secs</span>
          </div>
        </div>
      );
    }
  };

  if (date) {
    return (
      <Countdown
        date={date}
        onComplete={onComplete}
        renderer={renderCountdown}
      />
    );
  } else {
    return null;
  }
};
