# Image Upload Feature

## Overview

The image upload feature allows users to upload image files for use in image widgets and slides. The system includes proper file validation, type restrictions, and secure file handling.

## Features

### ✅ File Type Restrictions

- **Supported formats**: JPG, JPEG, PNG, GIF, WebP, SVG, BMP, TIFF
- **Client-side validation**: React Dropzone with MIME type checking
- **Server-side validation**: File signature verification

### ✅ File Size Limits

- **Maximum size**: 10MB per file
- **Client-side enforcement**: Dropzone validation
- **Server-side enforcement**: Request size validation

### ✅ Security Features

- **Authentication required**: Users must be logged in to upload
- **File signature validation**: Prevents malicious file uploads
- **Secure file naming**: Timestamp + random string naming
- **Directory isolation**: Files stored in `/public/uploads/images/`

### ✅ User Experience

- **Drag & drop interface**: Easy file selection
- **File preview**: Shows selected images before upload
- **Error handling**: Clear error messages for invalid files
- **Progress feedback**: Upload status and success confirmation

## API Endpoint

### POST `/api/slides/standalone_upload`

**Purpose**: Upload image files for use in widgets and slides

**Authentication**: Required (JWT token)

**Request Format**: `multipart/form-data`

- `slideFile`: File object (required)

**Response Format**: JSON

```json
{
  "url": "/uploads/images/1234567890_abcdef123.jpg",
  "filename": "1234567890_abcdef123.jpg",
  "originalName": "my-image.jpg",
  "size": 1024000,
  "type": "image/jpeg",
  "uploadedAt": "2024-01-01T12:00:00.000Z",
  "uploadedBy": "user_id"
}
```

**Error Responses**:

- `400`: Invalid file type, size too large, or no file provided
- `401`: Authentication required
- `500`: Server error during upload

## File Validation

### Client-Side (React Dropzone)

```typescript
accept={{
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
  'image/bmp': ['.bmp'],
  'image/tiff': ['.tiff', '.tif']
}}
maxSize={10 * 1024 * 1024} // 10MB
```

### Server-Side Validation

1. **MIME Type Check**: Validates against allowed image types
2. **File Size Check**: Enforces 10MB maximum
3. **File Signature Check**: Validates actual file content matches MIME type
4. **Buffer Validation**: Ensures file is not corrupted

## File Storage

### Directory Structure

```
public/
└── uploads/
    └── images/
        ├── .gitkeep
        ├── 1234567890_abcdef123.jpg
        ├── 1234567891_xyz789456.png
        └── ...
```

### File Naming Convention

- Format: `{timestamp}_{randomString}.{extension}`
- Example: `1704110400000_k2j3h4g5f6d.jpg`
- Prevents naming conflicts and provides uniqueness

## Usage in Components

### Image Widget Options

```typescript
// widgets/image/src/ImageOptions.tsx
<Input
  type="photo"
  name="upload"
  accept={{
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    // ... other formats
  }}
  onChange={this.handleChange}
/>
```

### Upload Component

```typescript
// components/Upload.tsx
<DropzoneWithNoSSR
  accept={{
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    // ... other formats
  }}
  maxSize={10 * 1024 * 1024}
  onDropAccepted={this.handleOnDropAccepted}
  onDropRejected={this.handleOnDropRejected}
/>
```

## Error Handling

### Client-Side Errors

- **Invalid file type**: Clear message with supported formats
- **File too large**: Shows maximum size limit
- **Upload failure**: Network or server error handling

### Server-Side Errors

- **Authentication**: 401 Unauthorized
- **Validation**: 400 Bad Request with specific error details
- **Storage**: 500 Internal Server Error for file system issues

## Security Considerations

1. **File Type Validation**: Both client and server-side checks
2. **File Size Limits**: Prevents DoS attacks via large files
3. **Authentication**: Only logged-in users can upload
4. **File Signatures**: Prevents malicious file uploads
5. **Secure Naming**: Prevents directory traversal attacks
6. **Isolated Storage**: Files stored in dedicated directory

## Troubleshooting

### Common Issues

1. **405 Method Not Allowed**

   - Ensure the API endpoint exists at `/api/slides/standalone_upload/route.ts`
   - Check that the POST method is exported

2. **File Type Rejected**

   - Verify file is a supported image format
   - Check file extension matches MIME type

3. **File Too Large**

   - Ensure file is under 10MB
   - Consider image compression for large files

4. **Upload Directory Missing**
   - Ensure `/public/uploads/images/` directory exists
   - Check file system permissions

### Debug Steps

1. Check browser console for client-side errors
2. Check server logs for upload errors
3. Verify authentication token is valid
4. Test with different image formats and sizes
