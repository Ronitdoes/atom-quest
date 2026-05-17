# Goal Tracking Portal - Development Philosophy

To ensure we build a stable, scalable, and high-quality MVP, we follow these core principles:

## DO NOT
- **Start with microservices**: Keep it a monolith for now.
- **Build analytics first**: Focus on the core user flows.
- **Over-optimize performance early**: Prioritize functionality and stability.
- **Create complicated abstractions**: Keep code readable and direct.
- **Build generic workflow engines**: Implement specific, simple workflows.
- **Use too many libraries**: Stick to the core stack.

## DO
- **Build vertical slices**: Complete one feature from UI to DB before moving to the next.
- **Ship working flows first**: Ensure the core "happy path" works.
- **Keep APIs simple**: Avoid unnecessary complexity in backend design.
- **Centralize business logic**: Keep logic in services/lib folders, not scattered in components.
- **Build stable foundations**: Ensure Auth and DB are solid before scaling.
- **Use AI for repetitive coding**: Let AI handle boilerplate (CRUD, types, basic UI).
- **Test workflows continuously**: Verify role access and logic transitions frequently.

---
*Derived from Section 0 of the Step-by-Step AI Build Guide.*
