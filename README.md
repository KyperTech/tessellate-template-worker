# Tessellate Worker: Templates

NodeJS worker that is triggered by Amazon SQS messages sent by [Tessellate](http://github.com/KyperTech/tessellate).

This worker handles templating actions for Tessellate including applying a template to a project.

Copy From Sources:
* Firebase Templates List
* S3 Templates list


Copy To Locations:
* Tessellate Project files list (stored on Firebase)
* Tessellate Project File hosting (on S3)
