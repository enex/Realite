export interface RealiteEvents {
  "realite.plan.shared": {
    name: string; // name of the realite
    description: string; // description of the realite
    url?: string; // url to information about the realite
  };
  "realite.plan.updated": {
    name?: string; // name of the realite
    description?: string; // description of the realite
    url?: string; // url of the realite
  };
  "realite.plan.cancelled": {};
}
