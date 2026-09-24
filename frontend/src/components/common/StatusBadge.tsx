import { Tag } from 'antd';

const STATUS_LABELS: Record<string, string> = {
  Available: '可用',
  OnTrip: '运输中',
  Maintenance: '维保中',
  Retired: '已报废',
  Pending: '待指派',
  Assigned: '已指派',
  InProgress: '进行中',
  Completed: '已完成',
  Cancelled: '已取消',
  Scheduled: '已预约',
  Leave: '休假中',
  Suspended: '已停用'
};

export function StatusBadge({ status }: { status: string }) {
  const color = status.includes('Available') || status.includes('Completed') ? 'green' : status.includes('Maintenance') || status.includes('InProgress') ? 'orange' : 'blue';
  return <Tag color={color}>{STATUS_LABELS[status] ?? status}</Tag>;
}
