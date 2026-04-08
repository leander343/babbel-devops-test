
resource "aws_cloudwatch_dashboard" "ecs_dashboard" {
  dashboard_name = "${var.name}-${var.environment}-ecs"

  dashboard_body = jsonencode({
    widgets = [

      # CPU
      {
        type  = "metric"
        x     = 0
        y     = 0
        width = 12
        height = 6

        properties = {
          title = "ECS CPU Utilization"
          metrics = [
            [
              "AWS/ECS",
              "CPUUtilization",
              "ClusterName", "${var.name}-${var.environment}-backend",
              "ServiceName", "${var.name}-${var.environment}-api"
            ]
          ]
          stat   = "Average"
          region = "${var.region}"
        }
      },

      # Memory
      {
        type  = "metric"
        x     = 12
        y     = 0
        width = 12
        height = 6

        properties = {
          title = "ECS Memory Utilization"
          metrics = [
            [
              "AWS/ECS",
              "MemoryUtilization",
              "ClusterName", "${var.name}-${var.environment}-backend",
              "ServiceName", "${var.name}-${var.environment}-api"
            ]
          ]
          stat   = "Average"
          region = "${var.region}"
        }
      },

      # Request count (ALB)
      {
        type  = "metric"
        x     = 0
        y     = 6
        width = 12
        height = 6

        properties = {
          title = "ALB Request Count"
          metrics = [
            [
              "AWS/ApplicationELB",
              "RequestCount",
              "LoadBalancer", "${var.alb_arn_suffix}"
            ]
          ]
          stat   = "Sum"
          region = "${var.region}"
        }
      },

      {
        type  = "log"
        x     = 0
        y     = 12
        width = 24
        height = 6

        properties = {
         title = "Error Logs"
         query = "SOURCE '${var.cloudwatch_log_group_name}' | filter @message like /ERROR/"
         region = "${var.region}"
         }
      },

      # Target response time
      {
        type  = "metric"
        x     = 12
        y     = 6
        width = 12
        height = 6

        properties = {
          title = "Response Time"
          metrics = [
            [
              "AWS/ApplicationELB",
              "TargetResponseTime",
              "LoadBalancer", "${var.alb_arn_suffix}"
            ]
          ]
          stat   = "Average"
          region = "${var.region}"
        }
      },

       {
         type  = "metric"
         x     = 16
         y     = 6
         width = 8
         height = 6
         properties = {
         title = "5XX Errors"
         metrics = [
         [
          "AWS/ApplicationELB",
          "HTTPCode_Target_5XX_Count",
          "LoadBalancer", "${var.alb_arn_suffix}"
         ],
         [
          ".",
          "HTTPCode_ELB_5XX_Count",
          ".",
          "."
          ]
        ]
       stat   = "Sum"
       region = "${var.region}"
    }
  }
    ]
  })
}