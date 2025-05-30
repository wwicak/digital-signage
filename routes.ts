// Attempt to import next-routes.
// If @types/next-routes is not installed or does not provide correct typings,
// this might require a custom declaration file (e.g., next-routes.d.ts).
import NextRoutes from 'next-routes';

// Define an interface for the instance returned by NextRoutes()
// This is based on the documented API of next-routes
interface RoutesInstance {
  add(name: string, pattern?: string, page?: string): this;
  add(pattern: string, page: string): this;
  add(options: { name: string; pattern?: string; page?: string }): this;
  // Add other methods if used (e.g., match, Link, Router)
  Link: React.ComponentType<any>; // Or more specific props
  Router: {
    pushRoute(name: string, params?: any, options?: any): Promise<void>;
    replaceRoute(name: string, params?: any, options?: any): Promise<void>;
    prefetchRoute(name: string, params?: any): Promise<React.ComponentType<any>>;
    // Add other Router methods/properties if used
  };
}

// The 'next-routes' module typically exports a constructor or a factory function.
// Let's assume `NextRoutes` is the correct import for that factory/constructor.
// If `NextRoutes` is a class: const routes = new NextRoutes();
// If `NextRoutes` is a function (common for this lib): const routes = NextRoutes();
// The original JS was `routes = require('next-routes')` then `routes()`.
// This implies the require returns a function that then needs to be called.

// So, the import should be:
// import actualRoutesFactory from 'next-routes';
// const routes = actualRoutesFactory();
// However, often the default import itself is the factory for convenience:
// import routesFactory from 'next-routes';
// const routes = routesFactory(); -> This seems to be the common pattern.

// Let's assume NextRoutes is the factory function itself based on common usage.
// If it's a class, it would be `new NextRoutes()`.
// If the default export is the factory:
const routesInstance: RoutesInstance = new (NextRoutes as any)();

// Type check the routes definition
const configuredRoutes: RoutesInstance = routesInstance
  .add('/slideshow/:id', 'slideshow')
  .add('/display/:display', 'display');
  // Example of adding a named route:
  // .add('namedRoute', '/custom-path/:param', 'customPage')

export default configuredRoutes;
