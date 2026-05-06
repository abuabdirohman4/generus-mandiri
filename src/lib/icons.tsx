import AlertIcon from "../../public/icons/alert.svg";
import AngleDownIcon from "../../public/icons/angle-down.svg";
import AngleUpIcon from "../../public/icons/angle-up.svg";
import ArrowDownIcon from "../../public/icons/arrow-down.svg";
import ArrowRightIcon from "../../public/icons/arrow-right.svg";
import ArrowUpIcon from "../../public/icons/arrow-up.svg";
import AudioIcon from "../../public/icons/audio.svg";
import BellIcon from "../../public/icons/bell.svg";
import BoltIcon from "../../public/icons/bolt.svg";
import BoxCubeIcon from "../../public/icons/box-cube.svg";
import BoxIconLine from "../../public/icons/box-line.svg";
import BoxIcon from "../../public/icons/box.svg";
import CalenderIcon from "../../public/icons/calender-line.svg";
import ChatIcon from "../../public/icons/chat.svg";
import CheckCircleIcon from "../../public/icons/check-circle.svg";
import CheckLineIcon from "../../public/icons/check-line.svg";
import ChevronDownIcon from "../../public/icons/chevron-down.svg";
import ChevronLeftIcon from "../../public/icons/chevron-left.svg";
import ChevronRightIcon from "../../public/icons/chevron-right.svg";
import ChevronUpIcon from "../../public/icons/chevron-up.svg";
import CloseLineIcon from "../../public/icons/close-line.svg";
import CloseIcon from "../../public/icons/close.svg";
import CopyIcon from "../../public/icons/copy.svg";
import DocsIcon from "../../public/icons/docs.svg";
import DollarLineIcon from "../../public/icons/dollar-line.svg";
import DownloadIcon from "../../public/icons/download.svg";
import EnvelopeIcon from "../../public/icons/envelope.svg";
import EyeCloseIcon from "../../public/icons/eye-close.svg";
import EyeIcon from "../../public/icons/eye.svg";
import FileIcon from "../../public/icons/file.svg";
import FolderIcon from "../../public/icons/folder.svg";
import GridIcon from "../../public/icons/grid.svg";
import GroupIcon from "../../public/icons/group.svg";
import HorizontaLDots from "../../public/icons/horizontal-dots.svg";
import ErrorIcon from "../../public/icons/info-hexa.svg";
import InfoIcon from "../../public/icons/info.svg";
import ListIcon from "../../public/icons/list.svg";
import LockIcon from "../../public/icons/lock.svg";
import MailIcon from "../../public/icons/mail-line.svg";
import MoreDotIcon from "../../public/icons/more-dot.svg";
import PageIcon from "../../public/icons/page.svg";
import PaperPlaneIcon from "../../public/icons/paper-plane.svg";
import PencilIcon from "../../public/icons/pencil.svg";
import PieChartIcon from "../../public/icons/pie-chart.svg";
import PlugInIcon from "../../public/icons/plug-in.svg";
import PlusIcon from "../../public/icons/plus.svg";
import ShootingStarIcon from "../../public/icons/shooting-star.svg";
import TableIcon from "../../public/icons/table.svg";
import TaskIcon from "../../public/icons/task-icon.svg";
import TimeIcon from "../../public/icons/time.svg";
import TrashBinIcon from "../../public/icons/trash.svg";
import UserCircleIcon from "../../public/icons/user-circle.svg";
import UserIcon from "../../public/icons/user-line.svg";
import VideoIcon from "../../public/icons/videos.svg";
import FileImageIcon from "../../public/icons/file-types/file-image.svg";
import FileImageDarkIcon from "../../public/icons/file-types/file-image-dark.svg";
import FilePdfIcon from "../../public/icons/file-types/file-pdf.svg";
import FilePdfDarkIcon from "../../public/icons/file-types/file-pdf-dark.svg";
import FileVideoIcon from "../../public/icons/file-types/file-video.svg";
import FileVideoDarkIcon from "../../public/icons/file-types/file-video-dark.svg";
import ReportIcon from "../../public/icons/report.svg";
import DashboardIcon from "../../public/icons/dashboard.svg";
import BuildingIcon from "../../public/icons/building.svg";
import SettingsIcon from "../../public/icons/settings.svg";
import KeyIcon from "../../public/icons/key.svg";
import BookOpenIcon from "../../public/icons/docs.svg";
import UsersIcon from "../../public/icons/group.svg";
import EyeOffIcon from "../../public/icons/eye-close.svg";
import FloppyDiskIcon from "../../public/icons/floppy-disk.svg";

// Standardized Icon Components using SVGs from QuickActions
export const MonitoringIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

export const PresensiIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const TahunAjaranIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

export const RapotIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

export {
  DownloadIcon,
  BellIcon,
  MoreDotIcon,
  FileIcon,
  GridIcon,
  AudioIcon,
  VideoIcon,
  BoltIcon,
  PlusIcon,
  BoxIcon,
  CloseIcon,
  CheckCircleIcon,
  AlertIcon,
  InfoIcon,
  ErrorIcon,
  ArrowUpIcon,
  FolderIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  GroupIcon,
  BoxIconLine,
  ShootingStarIcon,
  DollarLineIcon,
  TrashBinIcon,
  AngleUpIcon,
  AngleDownIcon,
  PencilIcon,
  CheckLineIcon,
  CloseLineIcon,
  ChevronDownIcon,
  PaperPlaneIcon,
  EnvelopeIcon,
  LockIcon,
  UserIcon,
  CalenderIcon,
  EyeIcon,
  EyeCloseIcon,
  TimeIcon,
  CopyIcon,
  ChevronLeftIcon,
  UserCircleIcon,
  ListIcon,
  TableIcon,
  PageIcon,
  TaskIcon,
  PieChartIcon,
  BoxCubeIcon,
  PlugInIcon,
  DocsIcon,
  MailIcon,
  HorizontaLDots,
  ChevronUpIcon,
  ChatIcon,
  ChevronRightIcon,
  FileImageIcon,
  FileImageDarkIcon,
  FilePdfIcon,
  FilePdfDarkIcon,
  FileVideoIcon,
  FileVideoDarkIcon,
  ReportIcon,
  DashboardIcon,
  BuildingIcon,
  SettingsIcon,
  KeyIcon,
  BookOpenIcon,
  UsersIcon,
  EyeOffIcon,
  FloppyDiskIcon
};
