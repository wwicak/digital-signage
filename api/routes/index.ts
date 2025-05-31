import express, { Router } from 'express'

// Import other route modules (now as .ts)
import displayRoutes from './display'
import slideRoutes from './slide'
import slideshowRoutes from './slideshow'
import userRoutes from './user'
import widgetRoutes from './widgets' // Assuming widgets.js was renamed to widgets.ts

const router: Router = express.Router()

// Health check or API root endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'API is working!',
    version: 'v1' // Or some other version info
  })
})

// Mount other routes
router.use('/displays', displayRoutes)
router.use('/slides', slideRoutes)
router.use('/slideshows', slideshowRoutes)
router.use('/users', userRoutes)
router.use('/widgets', widgetRoutes)

export default router
