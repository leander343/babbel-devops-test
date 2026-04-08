
locals {
  bucket_name = "{var.name}-${var.environment}"
}

data "aws_iam_user" "this" {
  user_name = "S3-bucket-user"
}


data "aws_iam_policy_document" "bucket_policy" {
  statement {
    principals {
      type        = "AWS"
      identifiers = [data.aws_iam_user.this.arn]
    }

    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject"
    ]

    resources = [
      "arn:aws:s3:::${local.bucket_name}/*",
    ]
  }
}



module "s3_bucket" {
  source = "terraform-aws-modules/s3-bucket/aws"

  bucket = "${local.bucket_name}"
  acl    = "private"

  control_object_ownership = true
  object_ownership         = "ObjectWriter"

  attach_policy             = true
  policy                    = data.aws_iam_policy_document.bucket_policy.json

}