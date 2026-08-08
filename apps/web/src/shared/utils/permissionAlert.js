import { notification } from 'antd';

/** Show an Ant Design error notification for missing permissions */
export const showPermissionError = (
  message = 'You do not have permission to perform this action.'
) => {
  notification.error({
    message: 'Access Denied',
    description: message,
    duration: 3,
  });
};
