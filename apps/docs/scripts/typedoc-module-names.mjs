// TypeDoc plugin for the API reference.
// - Names the core module after the import path users write, not the workspace package name.
// - Drops members inherited from outside the repo (React's HTML attributes), which would add hundreds of lines to every props page.
import { Converter, RendererEvent, ReflectionKind } from 'typedoc';

const names = { '@agentic-ui-kit/core': 'agentic-ui-kit/core' };

export function load(app) {
  app.converter.on(Converter.EVENT_RESOLVE_END, (context) => {
    const project = context.project;
    for (const reflection of Object.values(project.reflections)) {
      if (!reflection.kindOf(ReflectionKind.Property | ReflectionKind.Method) || !reflection.inheritedFrom) continue;
      const ref = reflection.inheritedFrom.reflection;
      const file = ref?.sources?.[0]?.fullFileName ?? reflection.sources?.[0]?.fullFileName ?? '';
      if (file.includes('/node_modules/')) project.removeReflection(reflection);
    }
  });
  app.renderer.on(RendererEvent.BEGIN, (event) => {
    for (const child of event.project.children ?? []) {
      if (names[child.name]) child.name = names[child.name];
    }
  });
}
