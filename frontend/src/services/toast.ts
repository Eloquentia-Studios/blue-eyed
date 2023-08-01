import { Notify } from 'notiflix/build/notiflix-notify-aio'

class Toast {
  private static iconColor = '#ffffff'
  private static notifyOptions: Notiflix.INotifyOptions = {
    borderRadius: '8px',
    messageMaxLength: 1000,
    clickToClose: true,
    fontFamily: 'ui-sans-serif',
    fontSize: '16px',
    cssAnimationStyle: 'from-right',
    closeButton: true,
    useIcon: true,
    useFontAwesome: true,
    fontAwesomeIconStyle: 'basic',
    fontAwesomeIconSize: '30px',
    success: {
      background: '#16a34a',
      notiflixIconColor: this.iconColor,
      fontAwesomeClassName: 'fa-solid fa-check',
      fontAwesomeIconColor: this.iconColor
    },
    failure: {
      background: '#dc2626',
      notiflixIconColor: this.iconColor,
      fontAwesomeClassName: 'fa-solid fa-exclamation',
      fontAwesomeIconColor: this.iconColor
    },
    warning: {
      background: '#d97706',
      notiflixIconColor: this.iconColor,
      fontAwesomeClassName: 'fa-solid fa-triangle-exclamation',
      fontAwesomeIconColor: this.iconColor
    },
    info: {
      background: '#0284c7',
      notiflixIconColor: this.iconColor,
      fontAwesomeClassName: 'fa-solid fa-info',
      fontAwesomeIconColor: this.iconColor
    }
  }

  public static success(message: string) {
    Notify.success(message, this.notifyOptions)
  }

  public static error(message: string) {
    Notify.failure(message, this.notifyOptions)
  }

  public static warning(message: string) {
    Notify.warning(message, this.notifyOptions)
  }

  public static info(message: string) {
    Notify.info(message, this.notifyOptions)
  }
}

export default Toast
