import React from 'react';
import { library, config, IconProp } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { fas, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

import AutoScroll from '../../../components/AutoScroll';
import * as z from 'zod';

config.autoAddCss = false;

// Zod schema for the announcement widget's content data, matching the component's internal usage
export const AnnouncementWidgetContentDataSchema = z.object({
  text: z.string().optional(),
  color: z.string().optional(), // Background color for the widget content
  textColor: z.string().optional(), // Text color for the main content
  titleTextColor: z.string().optional(), // Text color for the "Announcement" title bar
  accentColor: z.string().optional(), // Color for accents like the border-left of title bar
  title: z.string().optional(), // Optional title for the announcement content itself (not widget frame)
});
export type IAnnouncementWidgetData = z.infer<typeof AnnouncementWidgetContentDataSchema>;

// Zod schema for AnnouncementContent component props
export const AnnouncementContentPropsSchema = z.object({
  data: AnnouncementWidgetContentDataSchema.optional(),
  isPreview: z.boolean().optional(),
});
export type IAnnouncementContentProps = z.infer<typeof AnnouncementContentPropsSchema>;

const DEFAULT_COLOR = '#708090'; // Slate gray
const DEFAULT_TEXT_COLOR = '#ffffff'; // White
const DEFAULT_ACCENT_COLOR = '#EDC951'; // Goldenrod
const DEFAULT_TEXT = '';
const DEFAULT_TITLE_TEXT_COLOR = '#fff0f0'; // Snow

const AnnouncementContent: React.FC<IAnnouncementContentProps> = React.memo(({ data = {}, isPreview }) => {
  const text = data.text ?? DEFAULT_TEXT;
  const textColor = data.textColor ?? DEFAULT_TEXT_COLOR;
  const titleTextColor = data.titleTextColor ?? DEFAULT_TITLE_TEXT_COLOR;
  const color = data.color ?? DEFAULT_COLOR;
  const accentColor = data.accentColor ?? DEFAULT_ACCENT_COLOR;

  return (
    <div className='announce-widget-content'>
      <div className='title-bar'>
        <div className='icon'>
          <FontAwesomeIcon icon={faExclamationTriangle as IconProp} style={{ fontSize: '0.9em' }} color={accentColor} />
        </div>
        <span>Announcement</span>
      </div>
      <AutoScroll style={{ display: 'block', flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div className='text-content'>
          {text.split('\n').map((line, index) => (
            <div key={`line-${index}`}>{line || <br />}</div>
          ))}
        </div>
      </AutoScroll>
      <style jsx>
        {`
          .announce-widget-content {
            position: relative;
            box-sizing: border-box;
            height: 100%;
            width: 100%;
            background: ${color};
            color: ${textColor};
            flex: 1;
            padding: 12px;
            font-family: 'Open Sans', sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: center;
            overflow: hidden;
          }
          .announce-widget-content .text-content {
            font-family: 'Open Sans', sans-serif;
            font-size: 16px;
            font-weight: 600;
            text-align: center;
            z-index: 1;
            word-break: break-word;
            min-height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            box-sizing: border-box;
            width: 100%;
          }
          .announce-widget-content .icon {
            margin-right: 8px;
            display: flex;
            align-items: center;
          }
          .announce-widget-content .title-bar {
            color: ${titleTextColor};
            font-family: 'Open Sans', sans-serif;
            font-size: 16px;
            font-weight: 600;
            text-align: left;
            padding: 4px 8px;
            z-index: 1;
            border-left: 4px solid ${accentColor};
            display: flex;
            flex-direction: row;
            align-items: center;
            width: 100%;
            margin-bottom: 8px;
            box-sizing: border-box;
          }
        `}
      </style>
    </div>
  );
});

AnnouncementContent.displayName = 'AnnouncementContent';

export default AnnouncementContent;
