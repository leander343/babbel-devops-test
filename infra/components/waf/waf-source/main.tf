

resource "aws_wafv2_web_acl" "main" {
  name  = "${var.name}-${var.environment}-waf"
  scope       = "CLOUDFRONT"
  region = "us-east-1"

  default_action {
    allow {}
  }

  # Block common exploit patterns (SQLi, XSS, etc.)
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action { 
      none {} 
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.name}-${var.environment}-common-rules"
      sampled_requests_enabled   = true
    }
  }

  # Block known bad inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 2

    override_action { 
      none {}
     }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.name}-${var.environment}-bad-inputs"
      sampled_requests_enabled   = true
    }
  }

  # IP-level rate limit — 1000 req per 5 min per IP across all endpoints
  rule {
    name     = "IPRateLimit"
    priority = 3

    action { 
      block {} 
    }

    statement {
      rate_based_statement {
        limit              = 1000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.name}-${var.environment}-ip-rate-limit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.name}-${var.environment}-waf"
    sampled_requests_enabled   = true
  }

  tags = { Name = "${var.name}-${var.environment}-waf" }
}


